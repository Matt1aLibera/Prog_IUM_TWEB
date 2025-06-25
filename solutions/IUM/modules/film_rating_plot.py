import matplotlib.pyplot as plt
import seaborn as sns


def plot_combined_rating(df_bar, df_year_group, custom_palette, bins_anni):
    """
    Crea un grafico combinato che mostra:
    - Un istogramma stacked (barre sovrapposte) dei film rilasciati nel tempo, suddivisi per gruppi di rating
    - Una linea con il rating medio per ciascun intervallo di anni, sovrapposta su un secondo asse Y

    Il grafico permette di analizzare contemporaneamente la quantità di film prodotti e
    l’andamento della qualità percepita (rating medio) nel tempo.

    Args:
        df_bar (pd.DataFrame): DataFrame contenente almeno le colonne 'release_year' e 'rating_group'.
                               Usato per costruire le barre raggruppate per anno.
        df_year_group (pd.DataFrame): DataFrame contenente le colonne:
            - 'year_group_mid': punto centrale dell'intervallo temporale
            - 'rating_medio': media dei rating per ciascun gruppo di anni
        custom_palette (Dict[Any, str]): Mappa dei gruppi di rating ai colori.
        bins_anni (List[int]): Lista di soglie per dividere gli anni in intervalli temporali.

    Returns:
        None
    """
    # Configurazione figura
    plt.figure(figsize=(16, 8))

    # Grafico a barre
    ax = sns.histplot(
        data=df_bar,
        x='release_year',
        hue='rating_group',
        bins=len(bins_anni) - 1,
        multiple='stack',
        palette=custom_palette
    )

    # Grafico a linea (secondo asse)
    ax2 = ax.twinx()
    sns.lineplot(
        data=df_year_group,
        x='year_group_mid',
        y='rating_medio',
        color='black',
        marker='o',
        ax=ax2,
        label='Rating medio'
    )

    # Formattazione
    ax2.grid(False)
    ax2.set_yticklabels([])
    ax2.set_ylabel('')

    # Limiti con padding
    rating_min = df_year_group['rating_medio'].min()
    rating_max = df_year_group['rating_medio'].max()
    ax2.set_ylim(rating_min - 0.15, rating_max + 0.22)

    # Valori sopra i punti
    for x, y in zip(df_year_group['year_group_mid'], df_year_group['rating_medio']):
        ax2.text(x, y + 0.05, f'{y:.2f}',
                 color='black',
                 ha='center',
                 va='bottom',
                 fontsize=10)

    # Titoli/etichette
    plt.title('Numero di film, per rating, rilasciati negli anni e media del rating negli anni')
    ax.set_xlabel('Anno di rilascio')
    ax.set_ylabel('Numero di film')
    ax2.legend(loc='upper right')

    plt.show()