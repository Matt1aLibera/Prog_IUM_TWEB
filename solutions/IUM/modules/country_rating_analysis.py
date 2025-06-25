import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import pandas as pd


def plot_country_ratings(df_pivot, rating_medio_per_nazione, durata_media_per_nazione, custom_palette):
    """
    Crea un grafico orizzontale complesso che mostra:
    - Barre orizzontali stacked con il numero di film per gruppo di rating per ciascuna nazione
    - Lineplot sovrapposto con il rating medio per nazione
    - Lineplot secondario con la durata media per nazione

    Il grafico evidenzia contemporaneamente la distribuzione dei film per rating,
    la qualità media percepita (rating) e la durata media per paese.

    Args:
        df_pivot (pd.DataFrame): DataFrame pivot con le nazioni come indice e i gruppi di rating come colonne;
                                 i valori rappresentano il numero di film.
        rating_medio_per_nazione (pd.Series): Serie contenente il rating medio per ogni nazione.
        durata_media_per_nazione (pd.Series): Serie contenente la durata media (in minuti) per ogni nazione.
        custom_palette (Dict[Any, str]): Dizionario che mappa ciascun gruppo di rating a un colore.
    """

    # Applichiamo i colori corretti (senza convertire in stringhe)
    colors = [custom_palette[col] for col in df_pivot.columns]

    # Crea il grafico a barre orizzontali stacked
    fig, ax1 = plt.subplots(figsize=(12, 7))
    df_pivot.plot(kind='barh', stacked=True, color=colors, ax=ax1)

    ax1.set_title('Numero di film suddivisi per rating per nazione (Top 10 + Others), con durata media e rating medio')
    ax1.set_xlabel('Numero di film')
    ax1.set_ylabel('Nazione')

    # Creiamo il secondo asse X per il rating medio
    ax2 = ax1.twiny()
    ax2.plot(rating_medio_per_nazione, df_pivot.index,
             color='black', marker='o', linestyle='-',
             linewidth=2, label='Rating Medio')
    ax2.grid(False)

    # Creiamo il terzo asse X per la durata media
    ax3 = ax1.twiny()
    ax3.spines['top'].set_position(('outward', 40))
    ax3.plot(durata_media_per_nazione, df_pivot.index,
             color='blue', marker='s', linestyle='-',
             linewidth=2, label='Durata Media')
    ax3.set_xticks([])

    # Aggiungi valori alle linee
    for country, rating in zip(df_pivot.index, rating_medio_per_nazione):
        ax2.text(rating + 0.01, country, f'{rating:.1f}',
                 va='center', ha='left',
                 color='black', fontsize=10, fontweight='bold')

    for country, duration in zip(df_pivot.index, durata_media_per_nazione):
        ax3.text(duration + 5, country, f'{duration:.0f}',
                 va='center', ha='left',
                 color='blue', fontsize=10, fontweight='bold')

    # Legenda rating groups
    legend_patches = []
    for interval, color in custom_palette.items():
        if isinstance(interval, pd.Interval):
            label = f'{interval.left}-{interval.right}'
        else:
            label = str(interval)
        legend_patches.append(mpatches.Patch(color=color, label=label))

    # Inversione legenda
    legend_patches = legend_patches[::-1]
    ax1.legend(handles=legend_patches,
               title='Gruppo di rating',
               bbox_to_anchor=(1.05, 1),
               loc='upper left')

    # Legenda linee
    ax3.legend(handles=[
        plt.Line2D([0], [0], color='black', marker='o', linestyle='-', linewidth=2, label='Rating Medio'),
        plt.Line2D([0], [0], color='blue', marker='s', linestyle='-', linewidth=2, label='Durata Media (minuti)')
    ], bbox_to_anchor=(1.05, 1.15), loc='upper left')

    plt.tight_layout()
    plt.show()