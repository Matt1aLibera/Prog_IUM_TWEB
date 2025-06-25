import matplotlib.pyplot as plt
import pandas as pd


def prepare_rating_groups(df, bins):
    """
    Crea una nuova colonna 'rating_group' all'interno del DataFrame,
    assegnando ciascun film a un intervallo di rating specificato.

    Args:
        df (pd.DataFrame): DataFrame contenente almeno una colonna 'rating' con valori numerici.
        bins (List[float]): Lista di soglie numeriche che definiscono gli intervalli di rating.

    Returns:
        pd.DataFrame: Copia del DataFrame originale con una colonna aggiuntiva 'rating_group',
                      contenente gli intervalli di appartenenza per ogni valore di rating.
    """


def create_palette():
    """
    Restituisce una mappa colore predefinita per gruppi di rating, utilizzabile nei grafici.

    Returns:
        Dict[pd.Interval, str]: Dizionario che associa ogni intervallo di rating a un colore esadecimale.
                                Gli intervalli sono definiti secondo la logica di pd.cut().
    """


def plot_rating_duration(df_avg, df_avg_total, df_avg_rated, figsize=(12, 6)):
    """
    Crea un grafico a linee che mostra l'andamento della durata media dei film per anno,
    suddivisa per gruppi di rating.

    Include anche linee di riferimento per:
    - Durata media totale (tutti i film)
    - Durata media dei soli film con rating

    Args:
        df_avg (pd.DataFrame): DataFrame con colonne per ciascun intervallo di rating (Interval → durata media),
                               e indice temporale (anni).
        df_avg_total (pd.Series): Serie con la durata media totale per anno.
        df_avg_rated (pd.Series): Serie con la durata media dei soli film con rating per anno.
        figsize (tuple, optional): Dimensioni della figura matplotlib. Default: (12, 6)

    Returns:
        None
    """
    plt.figure(figsize=figsize)
    palette = create_palette()

    # Linee per intervalli di rating
    for interval, color in palette.items():
        if interval in df_avg.columns:
            plt.plot(df_avg.index, df_avg[interval],
                     label=f'{interval.left}-{interval.right}',
                     color=color)

    # Linee di riferimento
    plt.plot(df_avg_total.index, df_avg_total,
             label='Durata media totale',
             color='black', linestyle='--', linewidth=2)

    plt.plot(df_avg_rated.index, df_avg_rated,
             label='Durata media (film con rating)',
             color='blue', linestyle=':', linewidth=2)

    # Formattazione
    handles, labels = plt.gca().get_legend_handles_labels()
    plt.legend(handles[::-1], labels[::-1],
               title='Rating',
               bbox_to_anchor=(1.05, 1),
               loc='upper left')

    plt.xlabel('Anno di rilascio')
    plt.ylabel('Durata media (minuti)')
    plt.title('Durata media dei film per Anno e Rating')
    plt.show()