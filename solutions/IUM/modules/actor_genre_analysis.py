import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List
import pandas as pd

def plot_actor_genre_composition(
        top_actors: List[str],
        actor_stats_with_genre: pd.DataFrame,
        actor_avg_release_year: pd.DataFrame,
        unique_genres: List[str],
        genre_colors: Dict[str, tuple],
        global_avg_release_year: float,
        actors_to_analyse: int,
        figsize: tuple = (22, 25),
        linegraph_offset: int = 750
) -> None:
    """
    Crea il grafico a barre orizzontali con composizione per genere e anno medio di rilascio.
    Mantiene TUTTI i commenti originali.

    Args:
        top_actors: Lista degli attori top
        actor_stats_with_genre: DataFrame con le statistiche per genere
        actor_avg_release_year: DataFrame con gli anni medi di rilascio
        unique_genres: Lista ordinata di generi univoci
        genre_colors: Dizionario di colori per ogni genere
        global_avg_release_year: Valore medio globale
        actors_to_analyse: Numero di attori visualizzati
        figsize: Dimensioni della figura
        linegraph_offset: Offset per spostare il linegraph
    """
    # Crea il grafico
    fig, ax1 = plt.subplots(figsize=figsize)

    # Barplot orizzontale con barre della stessa lunghezza (100%)
    bars = sns.barplot(x=[100] * len(top_actors), y=top_actors, color='lightgray', ax=ax1)

    # Colora le barre in base alla percentuale di genere
    for i, (bar, actor) in enumerate(zip(bars.patches, top_actors)):
        actor_data = actor_stats_with_genre[actor_stats_with_genre['actor'] == actor]
        bottom = 0
        for genre in unique_genres:  # Usa tutti i generi univoci ordinati
            if genre in actor_data['genre'].unique():
                genre_percentage = actor_data[actor_data['genre'] == genre]['genre_percentage'].values[0]
            else:
                genre_percentage = 0
            ax1.barh(actor, genre_percentage, left=bottom, color=genre_colors[genre],
                     label=genre if i == 0 else "")
            bottom += genre_percentage

    # Imposta le etichette e il titolo
    ax1.set_xlabel('Composizione dei Generi (%)', fontsize=16)
    ax1.set_ylabel('Attore', fontsize=16)
    ax1.set_title(f'Attori con più film, suddivisi per genere (Top {actors_to_analyse})', fontsize=16)

    # Aggiungi il numero totale di film come annotazione
    for i, (actor, film_count) in enumerate(
            zip(top_actors, actor_stats_with_genre.groupby('actor')['film_count'].first())):
        ax1.text(105, i, f'{film_count} film', ha='left', va='center',
                 fontsize=9, color='black', fontweight='bold')

    # Lineplot per la media degli anni di rilascio
    ax2 = ax1.twiny()
    ax2.plot(actor_avg_release_year.set_index('actor').loc[top_actors, 'avg_release_year'] + linegraph_offset,
             range(len(top_actors)),
             color='red', marker='o', linestyle='-', linewidth=2,
             label='Media Anno di Rilascio (per attore)')

    # Aggiungi la scritta della media di rilascio
    for i, (actor, avg_year) in enumerate(zip(top_actors,
                                              actor_avg_release_year.set_index('actor').loc[
                                                  top_actors, 'avg_release_year'])):
        ax2.text(avg_year + linegraph_offset + 10, i, f'{int(avg_year)}',
                 ha='left', va='center', fontsize=16, color='red')

    # Aggiungi una linea verticale per l'anno medio globale
    ax2.axvline(global_avg_release_year + linegraph_offset, color='green',
                linestyle='--', linewidth=2,
                label='Media Anno di Rilascio (globale)')

    # Aggiungi un'annotazione per la media globale
    ax2.text(global_avg_release_year + linegraph_offset, len(top_actors) + 2,
             f'Media Globale: {global_avg_release_year:.1f}',
             ha='center', va='bottom', fontsize=16, color='green', fontweight='bold')

    # Configurazione assi
    ax2.set_xlim(600 + linegraph_offset, 2050 + linegraph_offset)
    ax2.set_xticks([])
    ax1.set_xlim(0, 120)

    # Gestione legende
    handles, labels = ax1.get_legend_handles_labels()
    by_label = dict(zip(labels, handles))
    ax1.legend(by_label.values(), by_label.keys(), title='Genere',
               bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=10)
    ax2.legend(loc='upper left', bbox_to_anchor=(1.05, 0.75), fontsize=10)

    plt.tight_layout()
    plt.show()